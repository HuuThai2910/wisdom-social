package iuh.fit.edu.backend.modules.feed.service;

import iuh.fit.edu.backend.modules.feed.dto.response.FeedSliceResponse;

import java.time.Instant;

public interface FeedService {

    FeedSliceResponse getFeed(Long userId, Instant lastRankingTime, String lastPostId, int size, String prioritizePostId);
}
