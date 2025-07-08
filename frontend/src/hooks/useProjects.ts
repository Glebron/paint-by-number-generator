import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, fetchProjects, processProject } from '../api/projectAPI';

export const useProjects = () => {
  const queryClient = useQueryClient();

  const { data: projects = [], ...rest } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const processMutation = useMutation({
  mutationFn: processProject,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  },
});




  return {
    projects,
    ...rest,
    createProject: mutation.mutate,
    createProjectStatus: mutation.status,
     processProject: processMutation.mutate,
  processProjectStatus: processMutation.status,
  };
};
