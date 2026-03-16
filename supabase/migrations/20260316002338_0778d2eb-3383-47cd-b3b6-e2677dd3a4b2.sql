
-- Create task status and priority enums
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'waiting', 'blocked', 'completed', 'canceled');
CREATE TYPE public.task_priority AS ENUM ('low', 'normal', 'high', 'critical');

-- Create vehicle_tasks table
CREATE TABLE public.vehicle_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'miscellaneous',
  linked_stage_id UUID REFERENCES public.workflow_stages(id) ON DELETE SET NULL,
  status public.task_status NOT NULL DEFAULT 'not_started',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  assignee_user_id UUID,
  due_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocker_reason TEXT,
  blocker_note TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by_user_id UUID,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by_user_id UUID,
  canceled_at TIMESTAMP WITH TIME ZONE,
  canceled_by_user_id UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Create vehicle_task_comments table
CREATE TABLE public.vehicle_task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.vehicle_tasks(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  user_id UUID,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_task_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_tasks
CREATE POLICY "Assigned users can view tasks" ON public.vehicle_tasks
  FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can create tasks" ON public.vehicle_tasks
  FOR INSERT TO authenticated
  WITH CHECK (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can update tasks" ON public.vehicle_tasks
  FOR UPDATE TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Platform admins can manage all tasks" ON public.vehicle_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS policies for vehicle_task_comments
CREATE POLICY "Assigned users can view task comments" ON public.vehicle_task_comments
  FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can create task comments" ON public.vehicle_task_comments
  FOR INSERT TO authenticated
  WITH CHECK (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Platform admins can manage all task comments" ON public.vehicle_task_comments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_vehicle_tasks_vehicle_id ON public.vehicle_tasks(vehicle_id);
CREATE INDEX idx_vehicle_tasks_dealership_id ON public.vehicle_tasks(dealership_id);
CREATE INDEX idx_vehicle_tasks_assignee ON public.vehicle_tasks(assignee_user_id);
CREATE INDEX idx_vehicle_tasks_status ON public.vehicle_tasks(status);
CREATE INDEX idx_vehicle_task_comments_task_id ON public.vehicle_task_comments(task_id);
