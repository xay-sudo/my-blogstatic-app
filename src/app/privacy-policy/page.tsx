
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-center">Privacy Policy</CardTitle>
          <CardDescription className="text-center">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose-base max-w-none dark:prose-invert text-foreground leading-relaxed">
          <p>
            Welcome to our Privacy Policy page. This document outlines how we collect, use, and protect your personal information when you visit our website.
            Please read this policy carefully to understand our practices.
          </p>

          <h2 className="font-semibold text-xl mt-6 mb-2">1. Information We Collect</h2>
          <p>
            We may collect personal information that you voluntarily provide to us, such as your name, email address, and any other information you choose to provide when you:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Subscribe to our newsletter.</li>
            <li>Leave comments on our posts (if applicable).</li>
            <li>Contact us through our contact form or email.</li>
          </ul>
          <p>
            We may also collect non-personal information automatically as you navigate through the site. This may include usage details, IP addresses, and information collected through cookies and other tracking technologies.
          </p>

          <h2 className="font-semibold text-xl mt-6 mb-2">2. How We Use Your Information</h2>
          <p>
            The information we collect is used for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>To present our website and its contents to you.</li>
            <li>To provide you with information, products, or services that you request from us.</li>
            <li>To fulfill any other purpose for which you provide it.</li>
            <li>To notify you about changes to our website or any products or services we offer.</li>
            <li>To improve our website and user experience.</li>
            <li>For internal analytics and research.</li>
          </ul>

          <h2 className="font-semibold text-xl mt-6 mb-2">3. Cookies and Tracking Technologies</h2>
          <p>
            Our website may use cookies and similar tracking technologies to enhance your experience. Cookies are small files placed on your computer&apos;s hard drive. You can refuse to accept browser cookies by activating the appropriate setting on your browser. However, if you select this setting you may be unable to access certain parts of our website.
          </p>

          <h2 className="font-semibold text-xl mt-6 mb-2">4. Data Security</h2>
          <p>
            We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. However, the transmission of information via the internet is not completely secure. Although we do our best to protect your personal information, we cannot guarantee the security of your personal information transmitted to our website.
          </p>

          <h2 className="font-semibold text-xl mt-6 mb-2">5. Third-Party Links</h2>
          <p>
            Our website may contain links to other websites that are not operated by us. If you click on a third-party link, you will be directed to that third party&apos;s site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
          </p>
          
          <h2 className="font-semibold text-xl mt-6 mb-2">6. Children&apos;s Privacy</h2>
          <p>
            Our website is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn we have collected or received personal information from a child under 13 without verification of parental consent, we will delete that information.
          </p>

          <h2 className="font-semibold text-xl mt-6 mb-2">7. Changes to Our Privacy Policy</h2>
          <p>
            It is our policy to post any changes we make to our privacy policy on this page. If we make material changes to how we treat our users&apos; personal information, we will notify you through a notice on the website home page. The date the privacy policy was last revised is identified at the top of the page.
          </p>

          <h2 className="font-semibold text-xl mt-6 mb-2">8. Contact Information</h2>
          <p>
            To ask questions or comment about this privacy policy and our privacy practices, please contact us via our Contact Us page.
          </p>
          
          <p className="mt-8 text-xs text-center">
            This is a template privacy policy. For a real website, you should consult with a legal professional to ensure it meets all legal requirements and accurately reflects your data practices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
