import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Edit3,
  Users,
  UserCheck,
  UserX,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
}

export function TeamMembersDialog({ open, onOpenChange, onClose }: TeamMembersDialogProps) {
  const { t } = useLanguage();
  const {
    teamMembers,
    activeMembers,
    addTeamMember,
    removeTeamMember,
    toggleTeamMember,
    updateTeamMember,
    resetToDefaults
  } = useTeamMembers();

  const [newMemberName, setNewMemberName] = useState('');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      addTeamMember(newMemberName.trim());
      setNewMemberName('');
    }
  };

  const handleStartEdit = (memberId: string, currentName: string) => {
    setEditingMember(memberId);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingMember && editingName.trim()) {
      updateTeamMember(editingMember, editingName.trim());
      setEditingMember(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditingName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen && onClose) {
        onClose();
      }
      if (!newOpen) {
        // Force refresh the page when dialog closes to show team member changes
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestionar Membres de l'Equip
          </DialogTitle>
          <DialogDescription>
            Afegeix, elimina o desactiva membres de l'equip per a l'assignació de tickets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new member */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="new-member" className="text-sm font-medium">
                    Nou Membre
                  </Label>
                  <Input
                    id="new-member"
                    placeholder="Nom del membre"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleAddMember)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAddMember}
                    disabled={!newMemberName.trim()}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Afegir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team members list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Membres ({activeMembers.length} actius)
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restablir per defecte
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teamMembers.map((member) => (
                <Card key={member.id} className={cn(
                  "transition-colors",
                  !member.isActive && "opacity-60 bg-muted/50"
                )}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {editingMember === member.id ? (
                          <div className="flex-1 flex gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyPress={(e) => handleKeyPress(e, handleSaveEdit)}
                              className="flex-1"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSaveEdit} disabled={!editingName.trim()}>
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancel·lar
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              {member.isActive ? (
                                <UserCheck className="w-4 h-4 text-green-600" />
                              ) : (
                                <UserX className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={cn(
                                "font-medium",
                                !member.isActive && "line-through text-muted-foreground"
                              )}>
                                {member.name}
                              </span>
                            </div>
                            <Badge variant={member.isActive ? "default" : "secondary"} className="text-xs">
                              {member.isActive ? 'Actiu' : 'Inactiu'}
                            </Badge>
                          </>
                        )}
                      </div>

                      {editingMember !== member.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleTeamMember(member.id)}
                            className="h-8 w-8 p-0"
                          >
                            {member.isActive ? (
                              <UserX className="w-3 h-3" />
                            ) : (
                              <UserCheck className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(member.id, member.name)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTeamMember(member.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {teamMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hi ha membres a l'equip</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tancar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}