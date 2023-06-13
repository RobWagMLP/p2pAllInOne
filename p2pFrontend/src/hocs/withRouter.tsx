import React from 'react';
import { useParams } from 'react-router-dom';

const withRouter = WrappedComponent => props => {
  const params = useParams();
  return (
    <WrappedComponent
      {...props}
      {...params}
    />
  );
};
export default withRouter;