package com.markdownmaps.backend.mindmap;

import java.nio.file.Path;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "markdown-maps")
public record MindMapStorageProperties(Path storagePath) {
}
