package com.markdownmaps.backend.mindmap;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class MindMapSnapshotService {

	private final ObjectMapper objectMapper;
	private final Path storagePath;

	public MindMapSnapshotService(
		ObjectMapper objectMapper,
		MindMapStorageProperties properties
	) {
		this.objectMapper = objectMapper;
		this.storagePath = properties.storagePath();
	}

	public JsonNode readSnapshot() {
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
}
