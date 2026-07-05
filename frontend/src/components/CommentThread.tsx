import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import CommentForm from './CommentForm';
import { timeAgo } from '../utils/time';

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
  createdAt?: string | null;
}

export function countComments(comments: Comment[]): number {
  return comments.reduce((sum, c) => sum + 1 + countComments(c.replies || []), 0);
}

const LIKE_COMMENT = gql`
  mutation LikeComment($commentId: Int!) {
    likeComment(commentId: $commentId)
  }
`;

const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: Int!) {
    deleteComment(commentId: $commentId)
  }
`;

const EDIT_COMMENT = gql`
  mutation EditComment($commentId: Int!, $content: String!) {
    editComment(commentId: $commentId, content: $content) {
      id
      content
    }
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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwn = user?.username === comment.author.username;

  const [likeComment] = useMutation(LIKE_COMMENT, {
    onError: (err) => console.error(err),
  });

  const [editComment, { loading: savingEdit }] = useMutation(EDIT_COMMENT, {
    onError: (err) => console.error(err),
  });

  const [deleteComment] = useMutation(DELETE_COMMENT, {
    onError: (err) => console.error(err),
  });

  const handleLike = () => {
    if (!user) return;
    const newLikedState = !comment.isLiked;
    const newCount = newLikedState ? comment.likesCount + 1 : comment.likesCount - 1;

    likeComment({
      variables: { commentId: comment.id },
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

  const handleEditSave = async () => {
    if (!editContent.trim()) return;
    try {
      await editComment({
        variables: { commentId: comment.id, content: editContent },
        optimisticResponse: {
          editComment: {
            __typename: 'CommentType',
            id: comment.id,
            content: editContent,
          },
        },
        update: (cache) => {
          const id = cache.identify({ __typename: 'CommentType', id: comment.id });
          if (id) {
            cache.modify({
              id,
              fields: { content: () => editContent },
            });
          }
        },
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment({
        variables: { commentId: comment.id },
        update: (cache) => {
          const id = cache.identify({ __typename: 'CommentType', id: comment.id });
          if (id) {
            cache.evict({ id });
            cache.gc();
          }
        },
      });
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className={`group mt-4 ${depth > 0 ? 'ml-6 border-l-2 border-line pl-4' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-surface-hover overflow-hidden shrink-0">
          {comment.author.avatar && (
            <img src={comment.author.avatar} className="w-full h-full object-cover" />
          )}
        </div>
        <span className="font-semibold text-sm text-ink">{comment.author.username}</span>
        <span className="text-xs text-ink-subtle">· {timeAgo(comment.createdAt)}</span>
      </div>

      {isEditing ? (
        <div className="mb-2">
          <textarea
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="input text-sm resize-none"
            rows={2}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              className="btn-ghost text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEditSave}
              disabled={!editContent.trim() || savingEdit}
              className="btn-primary text-xs px-4 py-1.5"
            >
              {savingEdit ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-ink-muted text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>
      )}

      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${comment.isLiked ? 'text-red-400' : 'text-ink-subtle hover:text-ink-muted'}`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill={comment.isLiked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.036l-7.682-7.682a4.5 4.5 0 010-6.364z"
            />
          </svg>
          {comment.likesCount > 0 && comment.likesCount}
        </button>

        {user && (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="text-xs text-ink-subtle hover:text-accent font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            Reply
          </button>
        )}

        {isOwn && !isEditing && (
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-ink-subtle hover:text-ink font-medium cursor-pointer transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="text-xs text-ink-subtle hover:text-red-400 font-medium cursor-pointer transition-colors"
            >
              Delete
            </button>
          </div>
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
  const [expanded, setExpanded] = useState(false);

  if (!comments || comments.length === 0) return null;

  const totalCount = countComments(comments);
  const visibleComments = expanded || comments.length <= 2 ? comments : comments.slice(0, 2);
  const hiddenCount = comments.length - visibleComments.length;

  return (
    <div className="mt-4 pt-4 border-t border-line">
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-ink-muted hover:text-ink text-sm mb-3 cursor-pointer transition-colors"
        >
          View all {totalCount} comments
        </button>
      )}
      {visibleComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postId={postId} />
      ))}
    </div>
  );
}
