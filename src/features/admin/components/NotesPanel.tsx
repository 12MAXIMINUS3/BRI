import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '@/lib/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/form/Field';
import { formatDate } from '@/features/account/components/format';
import { addNote, deleteNote, listNotes, type NoteEntity } from '../api/misc';
import { adminKeys } from '../keys';
import { Panel } from './AdminUi';

/** Private notes. Only administrators can read or write them (enforced by RLS). */
export function NotesPanel({ entityType, entityId }: { entityType: NoteEntity; entityId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const notes = useQuery({ queryKey: adminKeys.notes(entityType, entityId), queryFn: () => listNotes(entityType, entityId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.notes(entityType, entityId) });
  const add = useMutation({ mutationFn: () => addNote(entityType, entityId, body), onSuccess: () => { setBody(''); void refresh(); } });
  const remove = useMutation({ mutationFn: deleteNote, onSuccess: () => void refresh() });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (body.trim()) add.mutate();
  };

  return (
    <Panel title="Internal notes">
      <p className="-mt-3 mb-4 text-xs text-mist-400">Visible to administrators only. Customers never see these.</p>
      <form onSubmit={onSubmit} className="grid gap-3">
        <TextAreaField label="Add a note" rows={3} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
        <div>
          <Button type="submit" size="sm" loading={add.isPending} disabled={!body.trim()}>
            Save Note
          </Button>
        </div>
      </form>
      {(add.isError || remove.isError) && (
        <Alert tone="error" className="mt-4">
          {errorMessage(add.error ?? remove.error)}
        </Alert>
      )}
      <ul className="mt-6 grid gap-3">
        {(notes.data ?? []).map((note) => (
          <li key={note.id} className="rounded-sm border border-ink-700 bg-ink-900 p-4">
            <p className="text-sm whitespace-pre-line text-ivory-200">{note.body}</p>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-mist-400">
              <span>
                {note.profiles?.full_name || note.profiles?.email || 'Admin'} · {formatDate(note.created_at)}
              </span>
              <button type="button" onClick={() => remove.mutate(note.id)} className="text-mist-400 hover:text-[#f2a08c]">
                Delete
              </button>
            </div>
          </li>
        ))}
        {notes.data?.length === 0 && <li className="text-sm text-mist-500">No notes yet.</li>}
      </ul>
    </Panel>
  );
}
