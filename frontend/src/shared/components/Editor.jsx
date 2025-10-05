import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

export default function RichEditor({ value, onChange }) {
    return (
        <Editor
            apiKey="" // локально можно пусто, или ключ с tinymce.com
            value={value}
            onEditorChange={(content) => onChange(content)}
            init={{
                height: 360,
                menubar: false,
                plugins: 'link lists code image table',
                toolbar:
                    'undo redo | bold italic underline | bullist numlist | link image table | code',
                content_style:
                    'body{font-family:Inter, system-ui, sans-serif;font-size:14px}',
            }}
        />
    );
}
