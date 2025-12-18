import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../context/AuthContext';

const CREATE_COMMENT = gql`
  mutation CreateComment($username: String!, $postId: Int!, $content: String!, $parentId: Int) {
    createComment(username: $username, postId: $postId, content: $content, parentId: $parentId) {
      id
      content
      likesCount
      isLiked
      author { username avatar }
      replies {
        id
      }
    }
  }
`;

interface CommentFormProps {
  postId: number;
  parentId?: number; 
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CommentForm({ postId, parentId, onSuccess, onCancel }: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');

  const [createComment, { loading }] = useMutation(CREATE_COMMENT, {
    // FIX 1: Add Optimistic Response for instant "fake" update
    optimisticResponse: user ? {
        createComment: {
            __typename: "CommentType",
            id: -Math.round(Math.random() * 1000000), // Temporary ID
            content: content,
            likesCount: 0,
            isLiked: false,
            author: {
                __typename: "UserType",
                username: user.username,
                avatar: null // Or user.avatar if you have it in context
            },
            replies: []
        }
    } : undefined,

    // FIX 2: Robust Cache Update
    update(cache, { data: { createComment } }) {
      if (!createComment) return;

      if (parentId) {
        // SCENARIO A: Reply -> Add to Parent Comment
        const parentCacheId = cache.identify({ __typename: 'CommentType', id: parentId });
        
        if (parentCacheId) {
          cache.modify({
            id: parentCacheId,
            fields: {
              // SAFEGUARD: Handle null/undefined existing replies
              replies(existingReplies) {
                const current = existingReplies || [];
                
                const newReplyRef = cache.writeFragment({
                  data: createComment,
                  fragment: gql`
                    fragment NewReply on CommentType {
                      id
                      content
                      likesCount
                      isLiked
                      author { username avatar }
                      replies { id }
                    }
                  `
                });
                return [...current, newReplyRef];
              }
            }
          });
        }
      } else {
        // SCENARIO B: Root Comment -> Add to Post
        const postCacheId = cache.identify({ __typename: 'PostType', id: postId });
        
        if (postCacheId) {
          cache.modify({
            id: postCacheId,
            fields: {
              // SAFEGUARD: Handle null/undefined existing comments
              comments(existingComments) {
                const current = existingComments || [];

                const newCommentRef = cache.writeFragment({
                  data: createComment,
                  fragment: gql`
                    fragment NewComment on CommentType {
                      id
                      content
                      likesCount
                      isLiked
                      author { username avatar }
                      replies { id }
                    }
                  `
                });
                return [...current, newCommentRef];
              }
            }
          });
        }
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    try {
      await createComment({
        variables: { 
          username: user.username, 
          postId, 
          content, 
          parentId: parentId || null 
        }
      });
      setContent('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        autoFocus
        value={content}
        onKeyDown={handleKeyDown}
        onChange={(e) => setContent(e.target.value)}
        className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-pulse-blue outline-none resize-none transition-all placeholder-gray-500"
        placeholder={parentId ? "Write a reply..." : "Write a comment..."}
        rows={2}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-white px-3 py-1 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="bg-pulse-blue text-black text-xs font-bold px-4 py-1.5 rounded hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
