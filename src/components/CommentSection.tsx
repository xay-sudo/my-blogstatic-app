
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export default function CommentSection() {
  return (
    <section className="max-w-3xl mx-auto mt-12 py-8 border-t">
      <h2 className="text-2xl font-headline font-bold text-primary mb-6 flex items-center">
        <MessageCircle className="w-6 h-6 mr-2" />
        Comments
      </h2>
      <Card className="bg-muted/50 shadow-sm">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Comments for this post will appear here once a commenting system is integrated.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            To enable comments, you can integrate a third-party service like Disqus, Commento, Hyvor Talk, or build your own.
            Typically, this involves embedding their script or component within this section of the post page.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
