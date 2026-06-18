package com.markdownmaps.backend.mindmap;

import com.fasterxml.jackson.databind.JsonNode;
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

	public MindMapSnapshotController(MindMapSnapshotService snapshotService) {
		this.snapshotService = snapshotService;
	}

	@GetMapping
	public ResponseEntity<JsonNode> getSnapshot() {
		JsonNode snapshot = snapshotService.readSnapshot();

		if (snapshot == null) {
			return ResponseEntity.noContent().build();
		}

		return ResponseEntity.ok(snapshot);
	}

	@PutMapping
	public ResponseEntity<JsonNode> saveSnapshot(@RequestBody JsonNode snapshot) {
		return ResponseEntity.ok(snapshotService.writeSnapshot(snapshot));
	}
}
