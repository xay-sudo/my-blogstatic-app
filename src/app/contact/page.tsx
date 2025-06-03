
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, User, MessageSquare } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <Mail className="w-12 h-12 mx-auto text-primary mb-3" />
          <CardTitle className="text-3xl font-bold tracking-tight">Contact Us</CardTitle>
          <CardDescription>
            We&apos;d love to hear from you! Please fill out the form below to get in touch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                <User className="w-4 h-4 mr-2 text-muted-foreground" /> Full Name
              </label>
              <Input id="name" placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                <Mail className="w-4 h-4 mr-2 text-muted-foreground" /> Email Address
              </label>
              <Input id="email" type="email" placeholder="john.doe@example.com" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-muted-foreground" /> Message
              </label>
              <Textarea id="message" placeholder="Your message here..." rows={5} required />
            </div>
            <Button type="submit" className="w-full" variant="primary">
              Send Message
            </Button>
          </form>
          <p className="mt-6 text-xs text-center text-muted-foreground">
            Please note: This is a placeholder contact form. Submissions are not actually sent.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
