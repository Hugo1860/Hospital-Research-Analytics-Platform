import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicationFormComponent from '../components/publications/PublicationForm';
import PublicationListComponent from '../components/publications/PublicationList';
import PublicationImportComponent from '../components/publications/PublicationImport';

const PublicationList: React.FC = () => {
  return <PublicationListComponent />;
};

const PublicationAdd: React.FC = () => {
  return <PublicationFormComponent mode="create" />;
};

const PublicationEdit: React.FC = () => {
  return <PublicationFormComponent mode="edit" />;
};

const PublicationImport: React.FC = () => {
  return <PublicationImportComponent />;
};

const Publications: React.FC = () => {
  return (
    <Routes>
      <Route index element={<PublicationList />} />
      <Route path="add" element={<PublicationAdd />} />
      <Route path="edit/:id" element={<PublicationEdit />} />
      <Route path="import" element={<PublicationImport />} />
    </Routes>
  );
};

export default Publications;