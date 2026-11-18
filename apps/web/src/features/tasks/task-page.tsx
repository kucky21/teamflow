import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { TaskDetail } from './task-detail';

export function TaskPage() {
  const { taskRef = '' } = useParams();
  const navigate = useNavigate();
  return (
    <PageContainer className="max-w-6xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/tasks'))}
      >
        <ArrowLeft /> Zpět
      </Button>
      <TaskDetail taskRef={taskRef} variant="page" />
      <p className="sr-only">
        <Link to="/tasks">Všechny úkoly</Link>
      </p>
    </PageContainer>
  );
}
