"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Settings, Activity, Zap, Users, Bell } from "lucide-react";

interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  recentExecutions: number;
  usagePercentage: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalExecutions: 0,
    recentExecutions: 0,
    usagePercentage: 0,
  });
  const [recentWorkflows, setRecentWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchDashboardData();
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch workflows
      const workflowsResponse = await fetch("/api/workflows");
      if (workflowsResponse.ok) {
        const workflowsData = await workflowsResponse.json();
        const workflows = workflowsData.data || [];

        const totalWorkflows = workflows.length;
        const activeWorkflows = workflows.filter((w: any) => w.isActive).length;
        const totalExecutions = workflows.reduce((sum: number, w: any) => sum + (w._count?.executions || 0), 0);

        setStats({
          totalWorkflows,
          activeWorkflows,
          totalExecutions,
          recentExecutions: Math.floor(totalExecutions * 0.3), // Mock recent executions
          usagePercentage: Math.min(100, Math.floor((totalExecutions / 100) * 100)), // Based on free tier
        });

        // Get recent workflows
        setRecentWorkflows(workflows.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Mini-Zapier</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/integrations"
                className="text-gray-500 hover:text-gray-700"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <Link
                href="/dashboard/notifications"
                className="text-gray-500 hover:text-gray-700 relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-gray-700">{session?.user?.name || session?.user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || session?.user?.email}!
          </h2>
          <p className="text-gray-600 mt-1">Here's what's happening with your automation workflows.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Workflows</h3>
                <p className="text-2xl font-bold text-blue-600">{stats.totalWorkflows}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Active Workflows</h3>
                <p className="text-2xl font-bold text-green-600">{stats.activeWorkflows}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Executions</h3>
                <p className="text-2xl font-bold text-purple-600">{stats.totalExecutions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Usage</h3>
                <p className="text-2xl font-bold text-orange-600">{stats.usagePercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions and Recent Workflows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Link
                  href="/dashboard/workflows/new"
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">Create Workflow</h4>
                    <p className="text-sm text-gray-600">Build a new automation workflow</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/integrations"
                  className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Settings className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">Manage Integrations</h4>
                    <p className="text-sm text-gray-600">Connect your favorite services</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/analytics"
                  className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Activity className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">View Analytics</h4>
                    <p className="text-sm text-gray-600">Monitor workflow performance</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Workflows */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Recent Workflows</h3>
              <Link
                href="/dashboard/workflows"
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                View all
              </Link>
            </div>
            <div className="p-6">
              {recentWorkflows.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No workflows yet</p>
                  <Link
                    href="/dashboard/workflows/new"
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Workflow
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentWorkflows.map((workflow) => (
                    <Link
                      key={workflow.id}
                      href={`/dashboard/workflows/${workflow.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {workflow.description || "No description"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            workflow.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {workflow.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                        <span>{workflow._count?.executions || 0} executions</span>
                        <span>{new Date(workflow.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}