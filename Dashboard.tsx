import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, Users, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  task_count?: number;
  completed_tasks?: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  project_name: string;
  due_date: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (projectsError) throw projectsError;

      // Fetch project stats with task counts
      const projectsWithStats = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('status')
            .eq('project_id', project.id);

          const taskCount = tasks?.length || 0;
          const completedTasks = tasks?.filter(task => task.status === 'done').length || 0;

          return {
            ...project,
            task_count: taskCount,
            completed_tasks: completedTasks
          };
        })
      );

      setProjects(projectsWithStats);

      // Fetch recent tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          projects (name)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tasksError) throw tasksError;

      const formattedTasks = tasksData?.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        project_name: (task.projects as any)?.name || 'Unknown Project',
        due_date: task.due_date
      })) || [];

      setRecentTasks(formattedTasks);

      // Calculate stats
      const totalProjects = projectsWithStats.length;
      const activeProjects = projectsWithStats.filter(p => p.status === 'active').length;
      const totalTasks = projectsWithStats.reduce((sum, p) => sum + (p.task_count || 0), 0);
      const completedTasks = projectsWithStats.reduce((sum, p) => sum + (p.completed_tasks || 0), 0);

      setStats({
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks
      });

    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'default';
      case 'in_progress': return 'default';
      case 'todo': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your latest projects and their progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No projects yet. Create your first project to get started!
                </p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getPriorityColor(project.priority)}>
                          {project.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {project.task_count || 0} tasks
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-16">
                        <Progress 
                          value={project.task_count ? ((project.completed_tasks || 0) / project.task_count) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.completed_tasks || 0}/{project.task_count || 0}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {projects.length > 0 && (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/projects">View All Projects</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Your latest task activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tasks yet. Create a project and add some tasks!
                </p>
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className={`h-4 w-4 ${task.status === 'done' ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-muted-foreground">{task.project_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
