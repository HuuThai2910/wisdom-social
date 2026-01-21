import { useParams } from "react-router-dom";
import PostCard from "../components/post/PostCard";
import { mockPosts } from "../api/mockData";

export default function Post() {
    const { id } = useParams();
    const post = mockPosts.find((p) => p.id === id);

    if (!post) {
        return <div className="p-4 text-center">Post not found</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <PostCard post={post} />
        </div>
    );
}
