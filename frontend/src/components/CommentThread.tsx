import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import CommentForm from './CommentForm';

// --- Type Definitions ---
interface Author {
  username: string;
  avatar: string | null;
}

interface Comment {
  id: number;
  content: string;
  author: Author;
  likesCount: number;
  isLiked: boolean;
  replies: Comment[];
}

const LIKE_COMMENT = gql`
  mutation LikeComment($username: String!, $commentId: Int!) {
    likeComment(username: $username, commentId: $commentId)
  }
`;

const CommentItem = ({
  comment,
  postId,
  depth = 0,
}: {
  comment: Comment;
  postId: number;
  depth?: number;
}) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);

  const [likeComment] = useMutation(LIKE_COMMENT, {
    onError: (err) => console.error(err),
  });

  const handleLike = () => {
    if (!user) return;
    const newLikedState = !comment.isLiked;
    const newCount = newLikedState ? comment.likesCount + 1 : comment.likesCount - 1;

    likeComment({
      variables: { username: user.username, commentId: comment.id },
      optimisticResponse: { likeComment: newCount },
      update: (cache, { data: { likeComment: returnedCount } }) => {
        const id = cache.identify({ __typename: 'CommentType', id: comment.id });
        if (id) {
          cache.modify({
            id,
            fields: {
              likesCount: () => returnedCount,
              isLiked: () => newLikedState,
            },
          });
        }
      },
    });
  };

  return (
    <div className={`mt-4 ${depth > 0 ? 'ml-6 border-l-2 border-white/5 pl-4' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden">
          {comment.author.avatar && (
            <img src={comment.author.avatar} className="w-full h-full object-cover" />
          )}
        </div>
        <span className="font-bold text-sm text-gray-300">{comment.author.username}</span>
      </div>

      <p className="text-gray-400 text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>

      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-xs font-bold transition-colors ${comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
          {comment.likesCount > 0 && comment.likesCount}
        </button>

        {user && (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="text-xs text-gray-500 hover:text-pulse-blue font-bold flex items-center gap-1"
          >
            Reply
          </button>
        )}
      </div>

      {isReplying && (
        <div className="mb-4 animate-fade-in">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            onSuccess={() => setIsReplying(false)}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {comment.replies &&
        comment.replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
        ))}
    </div>
  );
};

export default function CommentThread({
  comments,
  postId,
}: {
  comments: Comment[];
  postId: number;
}) {
  if (!comments || comments.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postId={postId} />
      ))}
    </div>
  );
}
