import { useQuery } from '@tanstack/react-query';
import { getProjectBySlug, listProjects, type ListProjectsParams } from './api';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  list: (params: ListProjectsParams) => [...portfolioKeys.all, 'list', params] as const,
  detail: (slug: string) => [...portfolioKeys.all, 'detail', slug] as const,
};

export function useProjects(params: ListProjectsParams = {}) {
  return useQuery({ queryKey: portfolioKeys.list(params), queryFn: () => listProjects(params) });
}

export function useProject(slug: string | undefined) {
  return useQuery({
    queryKey: portfolioKeys.detail(slug ?? ''),
    queryFn: () => getProjectBySlug(slug ?? ''),
    enabled: !!slug,
  });
}
