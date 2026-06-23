package com.markdownmaps.backend.mindmap;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class MindMapSnapshotService {

	private final ObjectMapper objectMapper;
	private final RestClient supabaseClient;
	private final String defaultSnapshotId;
	private final Path storagePath;
	private final String supabaseApiKey;

	public MindMapSnapshotService(
		ObjectMapper objectMapper,
		MindMapStorageProperties properties
	) {
		this.objectMapper = objectMapper;
		this.storagePath = properties.storagePath();
		this.supabaseApiKey = properties.supabaseServiceRoleKey();
		if (hasText(properties.defaultSnapshotId())) {
			this.defaultSnapshotId = properties.defaultSnapshotId().trim();
		} else if (hasText(properties.supabaseSnapshotId())) {
			this.defaultSnapshotId = properties.supabaseSnapshotId().trim();
		} else {
			this.defaultSnapshotId = "default";
		}
		String storageBackend = hasText(properties.storageBackend())
			? properties.storageBackend().trim().toLowerCase(Locale.ROOT)
			: "json";

		if (!storageBackend.equals("json") && !storageBackend.equals("supabase")) {
			throw new IllegalArgumentException("Storage backend must be 'json' or 'supabase'");
		}

		if (storageBackend.equals("supabase")
			&& (!hasText(properties.supabaseUrl()) || !hasText(supabaseApiKey))) {
			throw new IllegalArgumentException(
				"Supabase storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
			);
		}

		this.supabaseClient = storageBackend.equals("supabase")
			? RestClient.builder()
				.baseUrl(stripTrailingSlash(properties.supabaseUrl()))
				.defaultHeader("apikey", supabaseApiKey)
				.defaultHeaders((headers) -> {
					if (!supabaseApiKey.startsWith("sb_secret_")) {
						headers.setBearerAuth(supabaseApiKey);
					}
				})
				.build()
			: null;
	}

	public JsonNode readSnapshot(String ownerId) {
		String snapshotId = normalizeSnapshotId(ownerId);

		if (supabaseClient != null) {
			JsonNode snapshot = readSupabaseSnapshot(snapshotId);

			if (snapshot != null) {
				return snapshot;
			}
		}

		Path ownerStoragePath = resolveStoragePath(snapshotId);

		if (!Files.exists(ownerStoragePath)) {
			return null;
		}

		try {
			return objectMapper.readTree(ownerStoragePath.toFile());
		} catch (IOException exception) {
			throw new MindMapStorageException("Failed to read mind map snapshot", exception);
		}
	}

	public JsonNode writeSnapshot(String ownerId, JsonNode snapshot) {
		if (snapshot == null || !snapshot.isObject()) {
			throw new IllegalArgumentException("Snapshot must be a JSON object");
		}

		String snapshotId = normalizeSnapshotId(ownerId);

		if (supabaseClient != null) {
			return writeSupabaseSnapshot(snapshotId, snapshot);
		}

		try {
			Path ownerStoragePath = resolveStoragePath(snapshotId);
			Path parent = ownerStoragePath.getParent();
			if (parent != null) {
				Files.createDirectories(parent);
			}
			objectMapper.writerWithDefaultPrettyPrinter().writeValue(ownerStoragePath.toFile(), snapshot);
			return snapshot;
		} catch (IOException exception) {
			throw new MindMapStorageException("Failed to write mind map snapshot", exception);
		}
	}

	private JsonNode readSupabaseSnapshot(String snapshotId) {
		try {
			JsonNode rows = supabaseClient.get()
				.uri(uriBuilder -> uriBuilder
					.path("/rest/v1/mind_map_snapshots")
					.queryParam("id", "eq." + snapshotId)
					.queryParam("select", "snapshot")
					.build())
				.retrieve()
				.body(JsonNode.class);

			if (rows == null || !rows.isArray() || rows.isEmpty()) {
				return null;
			}

			return rows.get(0).get("snapshot");
		} catch (RestClientException exception) {
			throw new MindMapStorageException("Failed to read Supabase mind map snapshot", exception);
		}
	}

	private JsonNode writeSupabaseSnapshot(String snapshotId, JsonNode snapshot) {
		ObjectNode payload = objectMapper.createObjectNode();
		payload.put("id", snapshotId);
		payload.set("snapshot", snapshot);

		try {
			JsonNode rows = supabaseClient.post()
				.uri("/rest/v1/mind_map_snapshots")
				.header("Prefer", "resolution=merge-duplicates,return=representation")
				.body(payload)
				.retrieve()
				.body(JsonNode.class);

			if (rows != null && rows.isArray() && !rows.isEmpty()) {
				JsonNode savedSnapshot = rows.get(0).get("snapshot");

				if (savedSnapshot != null) {
					return savedSnapshot;
				}
			}

			return snapshot;
		} catch (RestClientException exception) {
			throw new MindMapStorageException("Failed to write Supabase mind map snapshot", exception);
		}
	}

	private String normalizeSnapshotId(String ownerId) {
		return hasText(ownerId) ? ownerId.trim() : defaultSnapshotId;
	}

	private Path resolveStoragePath(String snapshotId) {
		if (snapshotId.equals(defaultSnapshotId)) {
			return storagePath;
		}

		Path parent = storagePath.getParent();
		String fileName = storagePath.getFileName().toString();
		int extensionStart = fileName.lastIndexOf('.');
		String baseName = extensionStart > 0 ? fileName.substring(0, extensionStart) : fileName;
		String extension = extensionStart > 0 ? fileName.substring(extensionStart) : ".json";
		String ownerFileName = "%s-%s%s".formatted(
			baseName,
			toStorageSafeId(snapshotId),
			extension
		);

		return parent == null ? Path.of(ownerFileName) : parent.resolve(ownerFileName);
	}

	private static String toStorageSafeId(String value) {
		String safeValue = value.replaceAll("[^A-Za-z0-9._-]", "_");

		return safeValue.isBlank() ? "default" : safeValue;
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	private static String stripTrailingSlash(String value) {
		return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
	}
}
