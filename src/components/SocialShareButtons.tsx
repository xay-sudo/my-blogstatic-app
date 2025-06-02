
'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Facebook, Twitter, Linkedin, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SocialShareButtonsProps {
  postUrl: string;
  postTitle: string;
  postDescription?: string; // Optional, for services like LinkedIn
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  postUrl,
  postTitle,
  postDescription,
}) => {
  const { toast } = useToast();

  const encodedPostUrl = encodeURIComponent(postUrl);
  const encodedPostTitle = encodeURIComponent(postTitle);
  const encodedPostDescription = postDescription ? encodeURIComponent(postDescription) : '';

  const shareActions = [
    {
      name: 'Facebook',
      icon: <Facebook className="h-5 w-5" />,
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedPostUrl}`, '_blank', 'noopener,noreferrer');
      },
      'aria-label': 'Share on Facebook',
    },
    {
      name: 'Twitter',
      icon: <Twitter className="h-5 w-5" />,
      action: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodedPostUrl}&text=${encodedPostTitle}`, '_blank', 'noopener,noreferrer');
      },
      'aria-label': 'Share on Twitter',
    },
    {
      name: 'LinkedIn',
      icon: <Linkedin className="h-5 w-5" />,
      action: () => {
        let linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedPostUrl}&title=${encodedPostTitle}`;
        if (encodedPostDescription) {
          linkedInUrl += `&summary=${encodedPostDescription}`;
        }
        window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
      },
      'aria-label': 'Share on LinkedIn',
    },
    {
      name: 'Copy Link',
      icon: <Copy className="h-5 w-5" />,
      action: async () => {
        try {
          await navigator.clipboard.writeText(postUrl);
          toast({
            title: 'Link Copied!',
            description: 'The post URL has been copied to your clipboard.',
          });
        } catch (err) {
          console.error('Failed to copy: ', err);
          toast({
            variant: 'destructive',
            title: 'Copy Failed',
            description: 'Could not copy the link to your clipboard.',
          });
        }
      },
      'aria-label': 'Copy post link',
    },
  ];

  return (
    <div className="mt-8 py-6 border-t">
      <h3 className="text-lg font-semibold mb-4 font-headline text-foreground">Share this post:</h3>
      <div className="flex flex-wrap gap-3">
        {shareActions.map((item) => (
          <Button
            key={item.name}
            variant="outline"
            size="icon"
            onClick={item.action}
            aria-label={item['aria-label']}
            title={item['aria-label']}
            className="transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SocialShareButtons;
