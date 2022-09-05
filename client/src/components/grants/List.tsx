import { useEffect } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loadProjects } from "../../actions/projects";
import { checkRoundApplications } from "../../actions/roundApplication";
import useLocalStorage from "../../hooks/useLocalStorage";
import { RootState } from "../../reducers";
import { Status } from "../../reducers/projects";
import { newGrantPath, roundPath } from "../../routes";
import colors from "../../styles/colors";
import { ProjectEvent } from "../../types";
import Button, { ButtonVariants } from "../base/Button";
import CallbackModal from "../base/CallbackModal";
import RoundApplyAlert from "../base/RoundApplyAlert";
import Globe from "../icons/Globe";
import Card from "./Card";

function ProjectsList() {
  const dispatch = useDispatch();

  const [toggleModal, setToggleModal] = useLocalStorage(
    "toggleRoundApplicationModal",
    false
  );

  const [roundToApply] = useLocalStorage("roundToApply", null);

  const props = useSelector((state: RootState) => {
    // undefined while the round application is loading, boolean once it's loaded
    let alreadyApplied: undefined | boolean;
    if (roundToApply) {
      const roundAddress = roundToApply.split(":")[1];
      const round = state.roundApplication[roundAddress];
      if (round !== undefined) {
        alreadyApplied = round.projectsIDs.length > 0;
      }
    }

    const showRoundModal =
      toggleModal && roundToApply && alreadyApplied === false;
    const showRoundAlert = alreadyApplied === false;

    return {
      loading: state.projects.status === Status.Loading,
      projects: state.projects.projects,
      chainID: state.web3.chainID,
      showRoundModal,
      showRoundAlert,
    };
  }, shallowEqual);

  const navigate = useNavigate();

  const roundInfo = null; // Placeholder, get from contract call or graph

  useEffect(() => {
    dispatch(loadProjects());
  }, [dispatch]);

  useEffect(() => {
    if (roundToApply && props.projects.length > 0) {
      const [chainID, roundAddress] = roundToApply.split(":");
      const ids = props.projects.map((p) => p.id);
      dispatch(checkRoundApplications(chainID, roundAddress, ids));
    }
  }, [props.projects]);

  return (
    <div className="flex flex-col flex-grow h-full mx-4 sm:mx-0">
      {props.loading && <>loading...</>}

      {!props.loading && (
        <>
          <div className="flex flex-col mt-4 mb-4">
            <h3>My Projects</h3>
            <p className="text-base">
              Manage projects across multiple grants programs.
            </p>
          </div>
          <RoundApplyAlert
            show={props.showRoundAlert}
            confirmHandler={() => {
              const chainId = roundToApply?.split(":")[0];
              const roundId = roundToApply?.split(":")[1];
              const path = roundPath(chainId, roundId);

              navigate(path);
            }}
          />
          <div className="grow">
            {props.projects.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {props.projects.map((event: ProjectEvent) => (
                  <Card projectId={event.id} key={event.id} />
                ))}
              </div>
            ) : (
              <div className="flex h-full justify-center items-center">
                <div className="flex flex-col items-center">
                  <div className="w-10">
                    <Globe color={colors["primary-background"]} />
                  </div>
                  <h4 className="mt-6">No projects</h4>
                  <p className="text-xs mt-6">
                    It looks like you haven&apos;t created any projects yet.
                  </p>
                  <p className="text-xs">Learn More</p>
                  <Link to={newGrantPath()} className="mt-6">
                    <Button variant={ButtonVariants.outline}>
                      Create a Project
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <CallbackModal
        modalOpen={props.showRoundModal}
        confirmText="Apply to Grand Round"
        confirmHandler={() => {
          const chainId = roundToApply?.split(":")[0];
          const roundId = roundToApply?.split(":")[1];
          const path = roundPath(chainId, roundId);

          navigate(path);
        }}
        headerImageUri="https://via.placeholder.com/300"
        toggleModal={setToggleModal}
      >
        <>
          <h5 className="font-semibold mb-2 text-2xl">
            Time to get your project funded!
          </h5>
          <p className="mb-4 ">
            Congratulations on creating your project on Grant Hub! Continue to
            apply for{" "}
            {
              roundInfo === null // || roundInfo.round.metadata === null
                ? "the round"
                : roundInfo // .round.metadata?.name
            }
            .
          </p>
        </>
      </CallbackModal>
    </div>
  );
}

export default ProjectsList;
