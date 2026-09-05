import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function PlaceholderPage({ title }) {
  return (
    <>
      <h1 className="mb-5 text-xl font-semibold text-foreground">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <Construction className="size-8 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            This screen is being migrated to the new interface.
          </div>
        </CardContent>
      </Card>
    </>
  );
}
