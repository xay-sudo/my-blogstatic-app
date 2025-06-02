'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { suggestTags } from '@/ai/flows/suggest-tags';
import TagBadge from './TagBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AISuggestTagsProps {
  postContent: string;
  currentTags: string[];
}

export default function AISuggestTags({ postContent, currentTags }: AISuggestTagsProps) {
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestTags = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestedTags([]);
    try {
      const result = await suggestTags({ blogPostContent: postContent });
      // Filter out tags that are already present and ensure uniqueness
      const newSuggestions = result.tags.filter(tag => !currentTags.includes(tag));
      setSuggestedTags(Array.from(new Set(newSuggestions)));
    } catch (e) {
      console.error('Error suggesting tags:', e);
      setError('Failed to suggest tags. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-primary" />
          AI Tag Suggestions
        </CardTitle>
        <CardDescription>
          Let AI help you find relevant tags for this post.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSuggestTags} disabled={isLoading} className="mb-4">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Suggesting...
            </>
          ) : (
            'Suggest Tags with AI'
          )}
        </Button>

        {error && (
          <div className="text-destructive flex items-center text-sm mb-4">
            <AlertCircle className="w-4 h-4 mr-2" /> {error}
          </div>
        )}

        {suggestedTags.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-foreground">Suggestions:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </div>
        )}
        {suggestedTags.length === 0 && !isLoading && !error && (
            <p className="text-sm text-muted-foreground">Click the button to get tag suggestions.</p>
        )}
      </CardContent>
    </Card>
  );
}
