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

@SpringBootTest(properties = "markdown-maps.storage-path=target/test-data/mind-map.json")
@AutoConfigureMockMvc
class BackendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@BeforeEach
	void cleanStorage() throws Exception {
		Files.deleteIfExists(Path.of("target/test-data/mind-map.json"));
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
}
