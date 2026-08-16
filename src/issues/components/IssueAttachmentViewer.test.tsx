import { render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import { IssueAttachmentViewer } from './IssueAttachmentViewer';

describe('IssueAttachmentViewer', () => {
  it('renders selected image attachment', () => {
    render(
      <IssueAttachmentViewer
        attachment={{
          id: 11,
          issueId: 123,
          mimeType: 'image/jpeg',
          name: 'photo.jpg',
          url: 'https://example.test/photo.jpg',
        }}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('photo.jpg')).toBeTruthy();
    expect(screen.getByTestId('issues:attachment-viewer:image').props.source).toEqual([
      { uri: 'https://example.test/photo.jpg' },
    ]);
    expect(screen.getByTestId('issues:attachment-viewer:close')).toBeTruthy();
  });
});
