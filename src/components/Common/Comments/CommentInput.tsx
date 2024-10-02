import React, { useState } from "react";
import { TextField, Button } from "@mui/material";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  initialContent?: string;
}

const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  initialContent = "",
}) => {
  const [newComment, setNewComment] = useState<string>(initialContent);

  const handleSubmit = () => {
    if (newComment.trim()) {
      onSubmit(newComment);
      setNewComment("");
    }
  };

  return (
    <div style={{ margin: "10px 0" }}>
      <TextField
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        label="Add a comment"
        fullWidth
        multiline
        style={{ marginBottom: 5 }}
      />
      <Button onClick={handleSubmit} variant="contained" color="secondary">
        Submit Comment
      </Button>
    </div>
  );
};

export default CommentInput;
