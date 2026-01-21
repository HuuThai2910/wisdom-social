import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import type { Post } from "../../types";

interface PostGridProps {
    posts: Post[];
}

export default function PostGrid({ posts }: PostGridProps) {
    return (
        <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
                <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="aspect-square relative group overflow-hidden bg-gray-100"
                >
                    <img
                        src={post.images[0]}
                        alt={post.caption}
                        className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                        <div className="flex items-center gap-2 font-semibold">
                            <Heart size={20} fill="white" />
                            <span>{post.likes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 font-semibold">
                            <MessageCircle size={20} fill="white" />
                            <span>{post.comments.length}</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
