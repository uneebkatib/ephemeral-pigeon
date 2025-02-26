
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailFilter {
  id: string;
  filter_type: string;
  pattern: string;
  is_active: boolean;
  created_at: string;
}

interface FiltersTableProps {
  filters: EmailFilter[];
  onFilterUpdated: () => Promise<void>;
}

export const FiltersTable = ({ filters, onFilterUpdated }: FiltersTableProps) => {
  const { toast } = useToast();

  const handleToggleFilter = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('email_filters')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to toggle filter",
        variant: "destructive",
      });
      return;
    }

    await onFilterUpdated();
    toast({
      title: "Success",
      description: "Filter updated successfully",
    });
  };

  const handleDeleteFilter = async (id: string) => {
    const { error } = await supabase
      .from('email_filters')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete filter",
        variant: "destructive",
      });
      return;
    }

    await onFilterUpdated();
    toast({
      title: "Success",
      description: "Filter deleted successfully",
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Pattern</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filters.map((filter) => (
          <TableRow key={filter.id}>
            <TableCell className="capitalize">{filter.filter_type}</TableCell>
            <TableCell>{filter.pattern}</TableCell>
            <TableCell>
              <Button
                variant={filter.is_active ? "default" : "secondary"}
                size="sm"
                onClick={() => handleToggleFilter(filter.id, filter.is_active)}
              >
                {filter.is_active ? "Active" : "Inactive"}
              </Button>
            </TableCell>
            <TableCell>{new Date(filter.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteFilter(filter.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
