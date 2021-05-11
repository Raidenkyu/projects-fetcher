import axios from 'axios';
import storage from 'node-persist';
import { writeFileSync, appendFileSync, readFileSync, existsSync } from 'fs';
import _ from 'lodash';

const searchDockerfile = async (projectName: string) => {
  const args = projectName.split('/');
  const response = await axios.get(`https://api.github.com/search/code?q=repo%3A${args[0]}%2F${args[1]}+filename%3ADockerfile`);

  return response.data.total_count;
}

const fetchProjects = async () => {
  await storage.init();

  if (!existsSync('./projects.csv')) {
    writeFileSync('./projects.csv', "name;count;url");
  }

  const projectsFileContent = readFileSync('./projects.csv', { encoding: 'utf8', flag: 'r' }).toString();

  const response = await axios.get('https://api.github.com/search/repositories?q=language%3Ajavascript+language%3Apython');
  const items = response.data.items;

  let notFound = true;

  try {
    do {
      const elem = _.sample(items);
      const projectName = elem.full_name;
      console.log(`Project ${projectName} Found`);

      const isStored = await storage.get(projectName) || false;

      if (!projectsFileContent.includes(projectName) && !isStored) {
        await storage.set(projectName, true);
        const dockerfileCount = await searchDockerfile(projectName);

        if (dockerfileCount > 0) {
          appendFileSync('./projects.csv', `${projectName};${dockerfileCount};${elem.html_url}\n`);
          notFound = false;
          console.log(`Project ${projectName} includes a Dockerfile`);
        }
        else {
          console.log(`Project ${projectName} does not include Dockerfile`);
        }
      }
      else {
        console.log(`Project ${projectName} is already included`);
      }
    } while (notFound);
  } catch (e) {
    console.log(e);
    console.log("Hourly limit exceeded");
  }

  return;
};

fetchProjects();