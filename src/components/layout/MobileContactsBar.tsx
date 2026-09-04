"use client";

import { Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/use-contacts";
import { useSelectedUser } from "@/context/user-context";

export function MobileContactsBar() {
  const { data: contacts = [] } = useContacts();
  const { selectedUserId, setSelectedUser, clearSelectedUser } = useSelectedUser();

  if (contacts.length === 0) return null;

  return (
    <div className="md:hidden flex items-center gap-2 border-b border-border bg-background px-3 py-1.5 overflow-x-auto">
      <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <button
        onClick={clearSelectedUser}
        className={cn(
          "text-xs px-2 py-0.5 rounded-full transition-colors shrink-0",
          !selectedUserId ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        All
      </button>
      {contacts.map((contact) => {
        const isSelected = selectedUserId === contact.canonical_id;
        return (
          <button
            key={contact.canonical_id}
            onClick={() => isSelected ? clearSelectedUser() : setSelectedUser(contact.canonical_id, contact.name)}
            className={cn(
              "text-xs px-2 py-0.5 rounded-full transition-colors capitalize shrink-0",
              isSelected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {contact.name}
          </button>
        );
      })}
      {selectedUserId && (
        <button onClick={clearSelectedUser} className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
