"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (apiKey: string) => void;
  onDelete?: () => void;
  hasExistingKey: boolean;
}

export function ApiKeyDialog({ open, onOpenChange, onSubmit, onDelete, hasExistingKey }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  // 다이얼로그가 열릴 때 입력값 초기화
  useEffect(() => {
    if (open) {
      setApiKey("");
      setError("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError("API 키를 입력해주세요.");
      return;
    }

    if (!trimmedKey.startsWith("sk-ant-")) {
      setError("올바른 Anthropic API 키 형식이 아닙니다.");
      return;
    }

    setError("");
    onSubmit(trimmedKey);
  };

  return (
    <Dialog open={open} onOpenChange={hasExistingKey ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md" showCloseButton={hasExistingKey}>
        <DialogHeader>
          <DialogTitle>API Key {hasExistingKey ? "설정" : "Required"}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>
                {hasExistingKey
                  ? "새로운 API 키를 입력하면 기존 키가 대체됩니다."
                  : "이 앱을 사용하려면 Anthropic API 키가 필요합니다."}
              </p>
              <p>
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Get your API key from https://console.anthropic.com
                </a>
              </p>
              <p className="text-xs text-muted-foreground">
                입력한 API 키는 브라우저의 로컬 스토리지에 저장됩니다.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError("");
              }}
              className="font-mono text-sm"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {hasExistingKey ? "API 키 변경" : "저장하고 시작하기"}
            </Button>
            {hasExistingKey && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
              >
                삭제
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
