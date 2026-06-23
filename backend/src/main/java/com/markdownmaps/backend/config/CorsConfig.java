package com.markdownmaps.backend.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

	private final String[] allowedOriginPatterns;

	public CorsConfig(
		@Value("${markdown-maps.cors-allowed-origin-patterns}") String allowedOriginPatterns
	) {
		this.allowedOriginPatterns = Arrays.stream(allowedOriginPatterns.split(","))
			.map(String::trim)
			.filter((origin) -> !origin.isEmpty())
			.toArray(String[]::new);
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
			.allowedOriginPatterns(allowedOriginPatterns)
			.allowedMethods("GET", "PUT", "OPTIONS")
			.allowedHeaders("*");
	}
}
