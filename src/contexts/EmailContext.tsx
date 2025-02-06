
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Email } from "@/types/email";

interface EmailContextType {
  email: string;
  setEmail: (email: string) => void;
  generateRandomEmail: () => void;
  copyEmail: () => void;
  adminDomains: any[];
  isLoadingAdminDomains: boolean;
  emails: Email[] | undefined;
  isLoadingEmails: boolean;
  refetchEmails: () => void;
  previousEmails: string[];
  setPreviousEmails: (emails: string[]) => void;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const EmailProvider = ({ children }: { children: React.ReactNode }) => {
  const [email, setEmail] = useState("");
  const [previousEmails, setPreviousEmails] = useState<string[]>([]);
  const { toast } = useToast();

  // Query admin domains
  const { data: adminDomains, isLoading: isLoadingAdminDomains } = useQuery({
    queryKey: ['adminDomains'],
    queryFn: async () => {
      console.log('Fetching domains');
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching domains:', error);
        toast({
          title: "Error",
          description: "Could not fetch domains. Please try again later.",
          variant: "destructive",
        });
        return [];
      }
      return data || [];
    },
    retry: 3,
    initialData: [], // Provide initial data to prevent undefined state
    refetchOnMount: true,
  });

  // Query emails with auto-refresh
  const { data: emails, isLoading: isLoadingEmails, refetch: refetchEmails } = useQuery({
    queryKey: ['emails', email],
    queryFn: async () => {
      if (!email) return [];
      
      console.log('Fetching emails for:', email);
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('temp_email', email)
        .order('received_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching emails:', error);
        toast({
          title: "Error",
          description: "Could not fetch emails. Please try again later.",
          variant: "destructive",
        });
        return [];
      }
      return data as Email[];
    },
    enabled: !!email,
    refetchInterval: 5000,
  });

  const generateRandomEmail = () => {
    const domains = adminDomains || [];
    if (!domains.length) {
      console.error('No domains available');
      toast({
        title: "Error",
        description: "No domains available. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    const random = Math.random().toString(36).substring(2, 10);
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    const newEmail = `${random}@${randomDomain.domain}`;
    
    // Add current email to previous emails if it exists
    if (email) {
      setPreviousEmails(prev => [email, ...prev.slice(0, 4)]); // Keep last 5 emails
    }
    
    setEmail(newEmail);
    
    toast({
      title: "New Email Created",
      description: newEmail,
    });
  };

  const copyEmail = () => {
    if (!email) return;
    
    navigator.clipboard.writeText(email);
    toast({
      title: "Copied!",
      description: "Email address copied to clipboard",
    });
  };

  // Generate email immediately if domains are available and no email exists
  useEffect(() => {
    if (!email && adminDomains && adminDomains.length > 0) {
      console.log('Generating initial email with domains:', adminDomains);
      generateRandomEmail();
    }
  }, [adminDomains]);

  // Setup realtime subscription
  useEffect(() => {
    if (!email) return;

    const channel = supabase
      .channel('emails-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails',
          filter: `temp_email=eq.${email}`,
        },
        (payload) => {
          console.log('New email received:', payload);
          refetchEmails();
          toast({
            title: "New Email Received!",
            description: `From: ${payload.new.from_email}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, refetchEmails]);

  return (
    <EmailContext.Provider 
      value={{ 
        email, 
        setEmail, 
        generateRandomEmail, 
        copyEmail,
        adminDomains: adminDomains || [],  // Ensure we never pass undefined
        isLoadingAdminDomains,
        emails,
        isLoadingEmails,
        refetchEmails,
        previousEmails,
        setPreviousEmails
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};

export const useEmail = () => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};
