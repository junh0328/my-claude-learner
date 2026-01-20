'use client';

import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  onClear: () => void;
  onOpenApiKeySettings: () => void;
  messageCount: number;
}

export function ChatHeader({ onClear, onOpenApiKeySettings, messageCount }: ChatHeaderProps) {
  return (
    <header className='flex items-center justify-between border-b border-border bg-background px-4 py-3'>
      <div className='flex items-center gap-3'>
        <div className='flex size-10 items-center justify-center rounded-full bg-primary'>
          <span className='text-lg font-semibold text-primary-foreground'>
            C
          </span>
        </div>
        <div>
          <h1 className='text-lg font-semibold'>Claude Chat</h1>
          <p className='text-sm text-muted-foreground'>
            준희닷의 AI 어시스턴트와 대화하세요
          </p>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onOpenApiKeySettings}
          title='API Key 설정'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' />
            <circle cx='12' cy='12' r='3' />
          </svg>
        </Button>
        {messageCount > 0 && (
          <Button variant='outline' size='sm' onClick={onClear}>
            대화 초기화
          </Button>
        )}
      </div>
    </header>
  );
}
