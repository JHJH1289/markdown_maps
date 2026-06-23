package com.markdownmaps.backend.mindmap;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mind-map")
public class MindMapSnapshotController {

	private final MindMapSnapshotService snapshotService;
	private final MindMapOwnerResolver ownerResolver;

	public MindMapSnapshotController(
		MindMapSnapshotService snapshotService,
		MindMapOwnerResolver ownerResolver
	) {
		this.snapshotService = snapshotService;
		this.ownerResolver = ownerResolver;
	}

	@GetMapping
	public ResponseEntity<JsonNode> getSnapshot(HttpServletRequest request) {
		JsonNode snapshot = snapshotService.readSnapshot(ownerResolver.resolveOwnerId(request));

		if (snapshot == null) {
			return ResponseEntity.noContent().build();
		}

		return ResponseEntity.ok(snapshot);
	}

	@PutMapping
	public ResponseEntity<JsonNode> saveSnapshot(
		HttpServletRequest request,
		@RequestBody JsonNode snapshot
	) {
		return ResponseEntity.ok(
			snapshotService.writeSnapshot(ownerResolver.resolveOwnerId(request), snapshot)
		);
	}
}
