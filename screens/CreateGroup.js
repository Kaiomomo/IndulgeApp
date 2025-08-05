import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CreateGroup = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Group Screen</Text>
    </View>
  );
};

export default CreateGroup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
