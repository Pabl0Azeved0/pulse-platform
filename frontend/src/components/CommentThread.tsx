import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../context/AuthContext';

interface Comment {
  id: number;
  content: string;
  author: { username: string; avatar: string | null };
  replies: Comment[];
}

const CREATE_COMMENT = gql`
  mutation CreateComment($username: String!, $postId: Int!, $content: String!, $parentId: Int) {
    createComment(username: $username, postId: $postId, content: $content, parentId: $parentId) {
      id
      content
      author { username }
    }
  }
`;

const CommentItem = ({ comment, postId, depth = 0 }: { comment: Comment, postId: number, depth?: number }) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [createComment] = useMutation(CREATE_COMMENT);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await createComment({
      variables: { 
        username: user.username, 
        postId, 
        content: replyContent, 
        parentId: comment.id
      },
    });
    setIsReplying(false);
    setReplyContent('');
  };

  return (
    <div className={`mt-4 ${depth > 0 ? 'ml-8 border-l-2 border-white/10 pl-4' : ''}`}>
      {/* Comment Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden">
             {comment.author.avatar && <img src={comment.author.avatar} className="w-full h-full" />}
        </div>
        <span className="font-bold text-sm text-gray-300">{comment.author.username}</span>
      </div>
      
      {/* Body */}
      <p className="text-gray-400 text-sm mb-2">{comment.content}</p>
      
      {/* Reply Button */}
      {user && (
        <button 
           onClick={() => setIsReplying(!isReplying)}
           className="text-xs text-pulse-blue hover:underline mb-2"
        >
           Reply
        </button>
      )}

      {/* Reply Input */}
      {isReplying && (
        <form onSubmit={handleReply} className="mb-4 flex gap-2">
           <input 
             type="text" 
             value={replyContent} 
             onChange={e => setReplyContent(e.target.value)}
             className="bg-black/50 border border-gray-700 rounded px-2 py-1 text-sm text-white flex-1"
             placeholder="Write a reply..."
           />
           <button type="submit" className="text-xs bg-pulse-green text-black px-3 py-1 rounded font-bold">Send</button>
        </form>
      )}

      {/* RECURSION: Render children */}
      {comment.replies && comment.replies.map(reply => (
        <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
      ))}
    </div>
  );
};

// --- MAIN WRAPPER ---
export default function CommentThread({ comments, postId }: { comments: Comment[], postId: number }) {
  return (
    <div className="mt-6 border-t border-white/5 pt-4">
       <h4 className="text-sm font-bold text-gray-500 mb-4">Discussion</h4>
       {comments.map(comment => (
         <CommentItem key={comment.id} comment={comment} postId={postId} />
       ))}
    </div>
  );
}