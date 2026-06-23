import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/categories';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/Modal';
import { useToastContext } from '../context/ToastContext';
import type { Category } from '@contracts/index';
import axios from 'axios';

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function buildTree(flat: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>(
    flat.map((c) => [c.id, { ...c, children: [] }]),
  );
  const roots: CategoryNode[] = [];
  for (const node of map.values()) {
    if (node.parentId) {
      map.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

interface TreeNodeProps {
  node: CategoryNode;
  depth: number;
  onEdit: (node: CategoryNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (node: CategoryNode) => void;
}

function TreeNode({ node, depth, onEdit, onAddChild, onDelete }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-surfaceHover group transition-colors"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`w-5 h-5 flex items-center justify-center text-text-muted transition-transform ${
            hasChildren ? 'hover:text-primary' : 'invisible'
          }`}
          aria-label={expanded ? 'Yopish' : 'Ochish'}
          aria-expanded={hasChildren ? expanded : undefined}
        >
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Name */}
        <span className="flex-1 text-sm text-text-primary font-medium">{node.name}</span>

        {/* Action buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(node)}
            aria-label={`${node.name} ni tahrirlash`}
            className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-primary-muted transition-colors"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            aria-label={`${node.name} ga bola kategoriya qo'shish`}
            className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-primary-muted transition-colors"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            aria-label={`${node.name} ni o'chirish`}
            className="p-1.5 rounded text-text-muted hover:text-[#9b2c2c] hover:bg-[#fff5f5] transition-colors"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface InlineInputProps {
  initialValue?: string;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
}

function InlineInput({ initialValue = '', onSave, onCancel, placeholder }: InlineInputProps) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    await onSave(trimmed);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSave();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder ?? "Kategoriya nomi"}
        disabled={loading}
        className="flex-1 bg-bg-elevated border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-2 focus:border-focus transition-all"
      />
      <Button type="button" size="sm" loading={loading} onClick={() => void handleSave()}>
        Saqlash
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
        Bekor
      </Button>
    </div>
  );
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastContext();

  const [editNode, setEditNode] = useState<CategoryNode | null>(null);
  const [addParentId, setAddParentId] = useState<string | null | 'root'>('initial');
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      createCategory({ name, parentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast("Kategoriya qo'shildi", 'success');
      setAddParentId('initial');
    },
    onError: () => {
      addToast("Xatolik yuz berdi", 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCategory(id, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast("Kategoriya yangilandi", 'success');
      setEditNode(null);
    },
    onError: () => {
      addToast("Xatolik yuz berdi", 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast("Kategoriya o'chirildi", 'success');
      setDeleteTarget(null);
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        addToast("Bu kategoriyada materiallar mavjud. Avval ularni ko'chiring.", 'error');
      } else {
        addToast("O'chirishda xatolik yuz berdi", 'error');
      }
      setDeleteTarget(null);
    },
  });

  const tree = buildTree(categories ?? []);

  const deleteMessage =
    deleteTarget
      ? deleteTarget.children?.length > 0
        ? `Bu kategoriyada ${deleteTarget.children.length} ta bola mavjud. O'chirishni tasdiqlaysizmi?`
        : `"${deleteTarget.name}" kategoriyasini o'chirmoqchimisiz?`
      : '';

  return (
    <Layout
      title="Kategoriyalar"
      actions={
        <Button size="sm" onClick={() => setAddParentId(null)}>
          + Yangi kategoriya
        </Button>
      }
    >
      <div className="max-w-2xl">
        <div className="bg-bg-elevated rounded-lg shadow-card border border-border overflow-hidden">
          {isLoading && (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded-md" />)}
            </div>
          )}

          {!isLoading && categories?.length === 0 && addParentId === 'initial' && (
            <div className="p-12 text-center">
              <img src="/brand/naqsh.svg" alt="" aria-hidden="true" className="mx-auto mb-4 w-24 opacity-25" />
              <p className="text-text-muted mb-4">Hech qanday kategoriya yo'q</p>
              <Button size="sm" onClick={() => setAddParentId(null)}>
                + Birinchi kategoriyani qo'shish
              </Button>
            </div>
          )}

          {!isLoading && (
            <div className="divide-y divide-border">
              {/* Add root category input */}
              {addParentId === null && (
                <InlineInput
                  placeholder="Yangi kategoriya nomi"
                  onSave={async (name) => {
                    await createMutation.mutateAsync({ name, parentId: null });
                  }}
                  onCancel={() => setAddParentId('initial')}
                />
              )}

              {tree.map((node) => (
                <div key={node.id}>
                  {editNode?.id === node.id ? (
                    <InlineInput
                      initialValue={node.name}
                      onSave={async (name) => {
                        await updateMutation.mutateAsync({ id: node.id, name });
                      }}
                      onCancel={() => setEditNode(null)}
                    />
                  ) : (
                    <TreeNode
                      node={node}
                      depth={0}
                      onEdit={setEditNode}
                      onAddChild={(parentId) => setAddParentId(parentId)}
                      onDelete={setDeleteTarget}
                    />
                  )}

                  {/* Add child input */}
                  {addParentId === node.id && (
                    <div style={{ paddingLeft: '36px' }}>
                      <InlineInput
                        placeholder="Bola kategoriya nomi"
                        onSave={async (name) => {
                          await createMutation.mutateAsync({ name, parentId: node.id });
                        }}
                        onCancel={() => setAddParentId('initial')}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        loading={deleteMutation.isPending}
        title="Kategoriyani o'chirish"
        message={deleteMessage}
      />
    </Layout>
  );
}
