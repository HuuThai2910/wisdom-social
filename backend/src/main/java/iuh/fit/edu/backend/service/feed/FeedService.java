package iuh.fit.edu.backend.service.feed;

import iuh.fit.edu.backend.dto.response.feed.FeedSliceResponse;

import java.time.Instant;

public interface FeedService {

    FeedSliceResponse getFeed(Long userId, Instant lastRankingTime, String lastPostId, int size, String prioritizePostId);
}
