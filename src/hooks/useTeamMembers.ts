import { useState, useEffect } from 'react';

export interface TeamMember {
  id: string;
  name: string;
  isActive: boolean;
}

const STORAGE_KEY = 'tecnics_bcn_team_members';

const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: 'quim', name: 'Quim', isActive: true },
  { id: 'norma', name: 'Norma', isActive: true },
  { id: 'helena', name: 'Helena', isActive: true },
  { id: 'yimmi', name: 'Yimmi', isActive: true }
];

export const useTeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM_MEMBERS);
  const [isLoading, setIsLoading] = useState(true);

  // Load team members from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTeamMembers(parsed);
      }
    } catch (error) {
      console.error('Error loading team members from localStorage:', error);
      // Fall back to defaults
      setTeamMembers(DEFAULT_TEAM_MEMBERS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever team members change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(teamMembers));
      } catch (error) {
        console.error('Error saving team members to localStorage:', error);
      }
    }
  }, [teamMembers, isLoading]);

  const addTeamMember = (name: string) => {
    if (!name.trim()) return;

    const newMember: TeamMember = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name: name.trim(),
      isActive: true
    };

    setTeamMembers(prev => {
      // Check if member already exists
      if (prev.some(member => member.name.toLowerCase() === name.toLowerCase())) {
        return prev;
      }
      return [...prev, newMember];
    });
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  const toggleTeamMember = (id: string) => {
    setTeamMembers(prev =>
      prev.map(member =>
        member.id === id ? { ...member, isActive: !member.isActive } : member
      )
    );
  };

  const updateTeamMember = (id: string, newName: string) => {
    if (!newName.trim()) return;

    setTeamMembers(prev =>
      prev.map(member =>
        member.id === id ? { ...member, name: newName.trim() } : member
      )
    );
  };

  const resetToDefaults = () => {
    setTeamMembers(DEFAULT_TEAM_MEMBERS);
  };

  // Get active team members for dropdown options
  const activeMembers = teamMembers.filter(member => member.isActive);

  return {
    teamMembers,
    activeMembers,
    isLoading,
    addTeamMember,
    removeTeamMember,
    toggleTeamMember,
    updateTeamMember,
    resetToDefaults
  };
};