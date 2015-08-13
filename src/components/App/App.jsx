import React, { PropTypes } from 'react';
import styles from './App.scss';
import withContext from '../../decorators/withContext';
import withStyles from '../../decorators/withStyles';
import Header from '../Header';
import Footer from '../Footer';

@withContext
@withStyles(styles)
class App {

  static propTypes = {
    children: PropTypes.element.isRequired,
    error: PropTypes.object,
  };

  render() {
    return !this.props.error
      ? (
        <div>
          <Header />
          {this.props.children}
          <Footer />
        </div>
      )
      : this.props.children;
  }

}

export default App;
