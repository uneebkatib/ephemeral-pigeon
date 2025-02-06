
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

interface CustomEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  onEmailCreated: (email: string) => void;
}

export const CustomEmailDialog = ({ 
  open, 
  onOpenChange, 
  domain,
  onEmailCreated 
}: CustomEmailDialogProps) => {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get the current session using React Query
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
  });

  const handleCreateEmail = async () => {
    if (!username) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    // Check authentication before proceeding
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a custom email",
        variant: "destructive",
      });
      onOpenChange(false);
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const emailAddress = `${username}@${domain}`;
      
      // Save custom email
      const { error } = await supabase
        .from('custom_emails')
        .insert({
          email_address: emailAddress,
          domain: domain,
          user_id: session.user.id
        });

      if (error) {
        console.error('Error creating custom email:', error);
        if (error.code === '42501' || error.message?.includes('authentication')) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please sign in again.",
            variant: "destructive",
          });
          onOpenChange(false);
          navigate("/login");
          return;
        }
        throw error;
      }

      toast({
        title: "Success",
        description: "Custom email created successfully",
      });
      
      onEmailCreated(emailAddress);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error in handleCreateEmail:', error);
      toast({
        title: "Error",
        description: "Failed to create custom email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Email</DialogTitle>
          <DialogDescription>
            Choose your custom email username. Domain will be {domain}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
              <span className="text-gray-500">@{domain}</span>
            </div>
          </div>
          <Button 
            onClick={handleCreateEmail}
            disabled={isLoading || !username}
          >
            {isLoading ? "Creating..." : "Create Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
