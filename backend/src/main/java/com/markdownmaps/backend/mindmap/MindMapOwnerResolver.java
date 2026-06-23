package com.markdownmaps.backend.mindmap;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MindMapOwnerResolver {

	public static final String OWNER_HEADER = "X-Mind-Map-Owner";

	private final String defaultSnapshotId;
	private final GoogleIdTokenVerifier googleIdTokenVerifier;

	public MindMapOwnerResolver(MindMapStorageProperties properties) {
		if (hasText(properties.defaultSnapshotId())) {
			this.defaultSnapshotId = properties.defaultSnapshotId().trim();
		} else if (hasText(properties.supabaseSnapshotId())) {
			this.defaultSnapshotId = properties.supabaseSnapshotId().trim();
		} else {
			this.defaultSnapshotId = "default";
		}

		this.googleIdTokenVerifier = hasText(properties.googleClientId())
			? new GoogleIdTokenVerifier.Builder(
				new NetHttpTransport(),
				GsonFactory.getDefaultInstance()
			)
				.setAudience(Collections.singletonList(properties.googleClientId().trim()))
				.build()
			: null;
	}

	public String resolveOwnerId(HttpServletRequest request) {
		String bearerToken = resolveBearerToken(request);

		if (hasText(bearerToken)) {
			return verifyGoogleToken(bearerToken);
		}

		String requestedOwnerId = request.getHeader(OWNER_HEADER);

		if (hasText(requestedOwnerId)) {
			return requestedOwnerId.trim();
		}

		return defaultSnapshotId;
	}

	private String verifyGoogleToken(String token) {
		if (googleIdTokenVerifier == null) {
			throw new ResponseStatusException(
				HttpStatus.UNAUTHORIZED,
				"Google sign-in is not configured"
			);
		}

		try {
			GoogleIdToken googleIdToken = googleIdTokenVerifier.verify(token);

			if (googleIdToken == null) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
			}

			return googleIdToken.getPayload().getSubject();
		} catch (GeneralSecurityException | IOException exception) {
			throw new ResponseStatusException(
				HttpStatus.UNAUTHORIZED,
				"Failed to verify Google token",
				exception
			);
		}
	}

	private static String resolveBearerToken(HttpServletRequest request) {
		String authorization = request.getHeader("Authorization");

		if (!hasText(authorization) || !authorization.startsWith("Bearer ")) {
			return null;
		}

		return authorization.substring("Bearer ".length()).trim();
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
