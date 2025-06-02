
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";

export default function CommentSection() {
  return (
    <section className="max-w-3xl mx-auto mt-12 py-8 border-t">
      <h2 className="text-2xl font-headline font-bold text-primary mb-6 flex items-center">
        <MessageCircle className="w-6 h-6 mr-2" />
        Leave a Comment
      </h2>
      <Card className="bg-muted/50 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Textarea
              placeholder="Write your comment here..."
              className="bg-background"
              rows={4}
              disabled
              aria-label="Comment input placeholder"
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" disabled>
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">
            This is a placeholder for comments. A third-party service (like Disqus, Commento, etc.) or a custom backend would need to be integrated to enable actual commenting.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
