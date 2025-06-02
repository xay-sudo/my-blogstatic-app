import { Badge } from '@/components/ui/badge';
import { TagIcon } from 'lucide-react'; // Using TagIcon, not TagsIcon

interface TagBadgeProps {
  tag: string;
}

export default function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors cursor-pointer">
      <TagIcon className="w-3 h-3 mr-1" />
      {tag}
    </Badge>
  );
}
