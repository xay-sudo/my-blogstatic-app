
'use client';

import { useState, type FormEvent } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export default function CommentSection() {
  const [commentText, setCommentText] = useState('');
  const { toast } = useToast();

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (commentText.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Empty Comment',
        description: 'Please write something before submitting.',
      });
      return;
    }

    // Simulate submission
    console.log('Simulated comment submission:', commentText);
    toast({
      title: 'Comment Submitted (Simulation)',
      description: 'Your comment has been sent for admin approval. This is a simulation and the comment is not actually saved.',
    });
    setCommentText(''); // Clear the textarea
  };

  return (
    <section className="max-w-3xl mx-auto mt-12 py-8 border-t">
      <h2 className="text-2xl font-headline font-bold text-primary mb-6 flex items-center">
        <MessageCircle className="w-6 h-6 mr-2" />
        Leave a Comment
      </h2>
      <Card className="bg-muted/50 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div>
              <Label htmlFor="comment-textarea" className="sr-only">Your Comment</Label>
              <Textarea
                id="comment-textarea"
                placeholder="Write your comment here..."
                className="bg-background"
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                aria-label="Comment input area"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground text-center pt-2">
            This is a placeholder comment section. Comments are not actually saved.
            A third-party service (like Disqus, Commento, etc.) or a custom backend would need to be integrated to enable actual commenting. All comments would be subject to admin approval.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
