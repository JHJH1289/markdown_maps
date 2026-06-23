package com.markdownmaps.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.markdownmaps.backend.mindmap.MindMapOwnerResolver;

@SpringBootTest(properties = "markdown-maps.storage-path=target/test-data/mind-map.json")
@AutoConfigureMockMvc
class BackendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@BeforeEach
	void cleanStorage() throws Exception {
		Path testDataDirectory = Path.of("target/test-data");

		if (!Files.exists(testDataDirectory)) {
			return;
		}

		try (var paths = Files.list(testDataDirectory)) {
			for (Path path : paths.toList()) {
				Files.deleteIfExists(path);
			}
		}
	}

	@Test
	void contextLoads() {
	}

	@Test
	void savesAndLoadsMindMapSnapshot() throws Exception {
		String snapshot = """
			{
			  "nodes": [],
			  "edges": [],
			  "documents": [],
			  "selectedDocumentId": null
			}
			""";

		mockMvc.perform(get("/api/mind-map"))
			.andExpect(status().isNoContent());

		mockMvc.perform(put("/api/mind-map")
				.contentType(MediaType.APPLICATION_JSON)
				.content(snapshot))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nodes").isArray());

		mockMvc.perform(get("/api/mind-map"))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.documents").isArray());
	}

	@Test
	void separatesSnapshotsByOwnerHeader() throws Exception {
		String firstSnapshot = """
			{
			  "nodes": [],
			  "edges": [],
			  "documents": [
			    { "id": "doc-a", "title": "A", "content": "", "updatedAt": "2026-06-23T00:00:00.000Z" }
			  ],
			  "selectedDocumentId": "doc-a"
			}
			""";
		String secondSnapshot = """
			{
			  "nodes": [],
			  "edges": [],
			  "documents": [
			    { "id": "doc-b", "title": "B", "content": "", "updatedAt": "2026-06-23T00:00:00.000Z" }
			  ],
			  "selectedDocumentId": "doc-b"
			}
			""";

		mockMvc.perform(put("/api/mind-map")
				.header(MindMapOwnerResolver.OWNER_HEADER, "google-user-a")
				.contentType(MediaType.APPLICATION_JSON)
				.content(firstSnapshot))
			.andExpect(status().isOk());

		mockMvc.perform(put("/api/mind-map")
				.header(MindMapOwnerResolver.OWNER_HEADER, "google-user-b")
				.contentType(MediaType.APPLICATION_JSON)
				.content(secondSnapshot))
			.andExpect(status().isOk());

		mockMvc.perform(get("/api/mind-map")
				.header(MindMapOwnerResolver.OWNER_HEADER, "google-user-a"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.selectedDocumentId").value("doc-a"));

		mockMvc.perform(get("/api/mind-map")
				.header(MindMapOwnerResolver.OWNER_HEADER, "google-user-b"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.selectedDocumentId").value("doc-b"));
	}
}
