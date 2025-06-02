
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { Comment } from '@/types';
import { CheckCircle, XCircle, Trash2, ExternalLink, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminCommentsClientPageProps {
  initialComments: Comment[];
}

export default function AdminCommentsClientPage({ initialComments }: AdminCommentsClientPageProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const { toast } = useToast();
  const [isProcessing, startTransition] = useTransition();

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleUpdateStatus = (commentId: string, newStatus: Comment['status']) => {
    startTransition(() => {
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId ? { ...comment, status: newStatus } : comment
        )
      );
      toast({
        title: `Comment ${newStatus}`,
        description: `Comment from ${comments.find(c => c.id === commentId)?.authorName || 'user'} has been ${newStatus} (simulation).`,
      });
    });
  };

  const handleDeleteComment = (commentId: string) => {
    startTransition(() => {
      const commentAuthor = comments.find(c => c.id === commentId)?.authorName || 'user';
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast({
        title: 'Comment Deleted',
        description: `Comment from ${commentAuthor} has been deleted (simulation).`,
      });
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status: Comment['status']) => {
    switch (status) {
      case 'approved':
        return 'default'; // Primary color
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Manage Comments</h1>
        <p className="text-muted-foreground">
          Review, approve, reject, or delete user comments.
        </p>
      </div>

      <Alert variant="default" className="mb-6 bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="font-semibold text-blue-700 dark:text-blue-300">Placeholder System</AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          This is a placeholder comment management system. Comments are mock data and are not persisted.
          Approval, rejection, and deletion are simulations only. Full functionality requires backend integration.
        </AlertDescription>
      </Alert>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Comments ({comments.length})</CardTitle>
          <CardDescription>Browse and manage comments submitted by users.</CardDescription>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">
              No comments to display.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead className="max-w-sm">Comment (Excerpt)</TableHead>
                  <TableHead className="hidden lg:table-cell">Related Post</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="font-medium">
                        {comment.authorName}
                        {comment.authorEmail && <div className="text-xs text-muted-foreground">{comment.authorEmail}</div>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={comment.content}>
                      {comment.content.substring(0, 60)}{comment.content.length > 60 ? '...' : ''}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {comment.postSlug && comment.postTitle ? (
                        <Link href={`/posts/${comment.postSlug}`} target="_blank" className="hover:underline text-primary" title={comment.postTitle}>
                          {comment.postTitle.substring(0, 30)}{comment.postTitle.length > 30 ? '...' : ''} <ExternalLink className="inline w-3 h-3 ml-0.5" />
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">{formatDate(comment.date)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(comment.status)} className="capitalize text-xs">
                        {comment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {comment.status === 'pending' && (
                        <Button variant="ghost" size="icon" title="Approve Comment" onClick={() => handleUpdateStatus(comment.id, 'approved')} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4 text-green-600" />}
                        </Button>
                      )}
                      {(comment.status === 'pending' || comment.status === 'approved') && (
                        <Button variant="ghost" size="icon" title="Reject Comment" onClick={() => handleUpdateStatus(comment.id, 'rejected')} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4 text-orange-600" />}
                        </Button>
                      )}
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Comment" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4 text-destructive" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the comment by &quot;{comment.authorName}&quot;. This action is a simulation and cannot be undone in this demo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={isProcessing}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              {isProcessing ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
