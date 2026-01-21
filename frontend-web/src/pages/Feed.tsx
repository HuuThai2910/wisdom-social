import { mockPosts, mockStories } from "../api/mockData";
import StoriesBar from "../components/story/StoriesBar";
import PostCard from "../components/post/PostCard";

export default function Feed() {
    return (
        <div>
            {/* Stories */}
            <StoriesBar stories={mockStories} />

            {/* Posts Feed */}
            <div>
                {mockPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>
        </div>
    );
}
