
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, BarChart2, Settings, Newspaper, TagsIcon } from "lucide-react"; // Added Newspaper, TagsIcon
import * as postService from '@/lib/post-service'; // Import postService

export default async function AdminDashboardPage() {
  const posts = await postService.getAllPosts();
  const totalPosts = posts.length;

  const allTags = posts.flatMap(post => post.tags);
  const uniqueTags = new Set(allTags.map(tag => tag.toLowerCase()));
  const totalUniqueTags = uniqueTags.size;

  return (
    <div className="space-y-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the Newstoday admin panel. Manage your content and settings here.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Total Posts</CardTitle>
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPosts}</p>
            <CardDescription className="text-xs">Published articles on your site.</CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Unique Tags</CardTitle>
              <TagsIcon className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUniqueTags}</p>
            <CardDescription className="text-xs">Distinct tags used for content.</CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Manage Blog Posts</CardTitle>
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">Create, edit, and organize your blog content.</CardDescription>
            <Link href="/admin/posts">
              <Button variant="primary" className="w-full">Go to Posts</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Site Settings</CardTitle>
              <Settings className="w-6 h-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">Configure general settings for your blog.</CardDescription>
            <Link href="/admin/settings">
              <Button variant="primary" className="w-full">Configure Settings</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Analytics</CardTitle>
              <BarChart2 className="w-6 h-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3">View statistics about your blog's performance.</CardDescription>
            <Button variant="outline" className="w-full" disabled>View Analytics</Button>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
