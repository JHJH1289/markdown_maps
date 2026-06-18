package com.markdownmaps.backend.mindmap;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

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
	private final Path storagePath;
	private final String supabaseApiKey;
	private final String supabaseSnapshotId;

	public MindMapSnapshotService(
		ObjectMapper objectMapper,
		MindMapStorageProperties properties
	) {
		this.objectMapper = objectMapper;
		this.storagePath = properties.storagePath();
		this.supabaseApiKey = properties.supabaseServiceRoleKey();
		this.supabaseSnapshotId = hasText(properties.supabaseSnapshotId())
			? properties.supabaseSnapshotId()
			: "default";
		this.supabaseClient = hasText(properties.supabaseUrl()) && hasText(supabaseApiKey)
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

	public JsonNode readSnapshot() {
		if (supabaseClient != null) {
			JsonNode snapshot = readSupabaseSnapshot();

			if (snapshot != null) {
				return snapshot;
			}
		}

		if (!Files.exists(storagePath)) {
			return null;
		}

		try {
			return objectMapper.readTree(storagePath.toFile());
		} catch (IOException exception) {
			throw new MindMapStorageException("Failed to read mind map snapshot", exception);
		}
	}

	public JsonNode writeSnapshot(JsonNode snapshot) {
		if (snapshot == null || !snapshot.isObject()) {
			throw new IllegalArgumentException("Snapshot must be a JSON object");
		}

		if (supabaseClient != null) {
			return writeSupabaseSnapshot(snapshot);
		}

		try {
			Path parent = storagePath.getParent();
			if (parent != null) {
				Files.createDirectories(parent);
			}
			objectMapper.writerWithDefaultPrettyPrinter().writeValue(storagePath.toFile(), snapshot);
			return snapshot;
		} catch (IOException exception) {
			throw new MindMapStorageException("Failed to write mind map snapshot", exception);
		}
	}

	private JsonNode readSupabaseSnapshot() {
		try {
			JsonNode rows = supabaseClient.get()
				.uri(uriBuilder -> uriBuilder
					.path("/rest/v1/mind_map_snapshots")
					.queryParam("id", "eq." + supabaseSnapshotId)
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

	private JsonNode writeSupabaseSnapshot(JsonNode snapshot) {
		ObjectNode payload = objectMapper.createObjectNode();
		payload.put("id", supabaseSnapshotId);
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

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	private static String stripTrailingSlash(String value) {
		return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
	}
}
